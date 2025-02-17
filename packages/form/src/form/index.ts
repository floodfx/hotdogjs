import { SomeZodObject, ZodIssue, type ZodSchema } from "zod";

/**
 * Validation errors keyed by properties of T
 */
export type FormErrors<T> = {
  [Property in keyof T]?: string;
};

/**
 * Form makes it easy to have a html form that automatically validates and creates an object of type T.
 */
export interface Form<T> {
  /**
   * Optional string representing the action occuring on the changeset. If the action is not
   * present on a changeset, the validation rules are NOT applied.  This is useful for "empty"
   * changesets used to model an empty form.
   */
  readonly action?: string;
  /**
   * The validation errors keyed by the field names of T.
   */
  readonly errors?: FormErrors<T>;
  /**
   * The merged data between the initial state and the updated state.
   */
  readonly data: T | Partial<T>;
  /**
   * Whether the changeset is valid.  A changeset is valid if there are no validation errors.  Note again,
   * an undefined action means no validation rules will be applied and thus there will be no validation
   * errors in that case and the changeset will be considered valid.
   */
  readonly valid: boolean;

  /**
   * A custom message that can be set and displayed by the developer
   */
  customMessage?: string;

  /**
   * Update the form with new attributes and an optional action.
   */
  update(newAttrs: Partial<T>, action?: string): void;

  /**
   * Reset the form to its initial state.
   */
  reset(): void;
}

/**
 * A Form implementation that uses Zod for validation.
 */
export class ZodForm<T extends object> implements Form<T> {
  #schema: SomeZodObject | ZodSchema;
  #data: Partial<T>;
  #action?: string;
  #touched: Set<keyof T>;
  #valid: boolean;
  #errors?: FormErrors<T>;

  constructor(schema: SomeZodObject | ZodSchema, data?: Partial<T>, action?: string) {
    this.#schema = schema;
    this.#data = data ?? {};
    this.#action = action;
    this.#touched = new Set<keyof T>();
    this.#valid = true;
  }

  get data(): T | Partial<T> {
    return this.#data;
  }

  get action(): string | undefined {
    return this.#action;
  }

  get valid(): boolean {
    return this.#valid;
  }

  get errors(): FormErrors<T> | undefined {
    return this.#errors;
  }

  customMessage?: string | undefined;

  update(newAttrs: Partial<T>, action?: string) {
    this.#action = action;
    this.#data = { ...this.#data, ...newAttrs };

    // check if update is for a specific field
    const hasTarget = Object.keys(newAttrs).some((key) => key === "_target");
    const target = (newAttrs as any)["_target"] as keyof FormErrors<T> | undefined;

    // for key in newAttrs update touched
    for (const key in newAttrs) {
      // skip adding to touched if hasTarget and key is not target
      if (hasTarget && target !== key) {
        continue;
      }
      this.#touched.add(key as keyof T);
    }

    // handle case where _target is set but the newData does not contain the _target field
    // this happens in the case of a checkbox that is unchecked
    if (target && !newAttrs[target]) {
      delete this.#data[target];
    }

    // clear validation and errors
    this.#valid = true;
    this.#errors = undefined;

    // if action is undefined, we don't run validations
    if (!action) {
      return;
    }

    // if action is present, we run validations
    const result = this.#schema.safeParse(this.#data);
    this.#valid = result.success;
    // if we have no errors, we are done
    if (result.success) {
      this.#data = result.data as T;
      return;
    }

    // otherwise (we have errors) so build the errors mapping
    this.#errors = result.error.issues.reduce((acc: FormErrors<T>, issue: ZodIssue) => {
      const path = issue.path[0] as keyof T;

      // if no target is present, include all errors
      if (!target) {
        // @ts-ignore
        acc[path] = issue.message;
        return acc;
      }
      // if not target but has been touched, include the error
      if (this.#touched.has(path)) {
        acc[path] = issue.message;
        return acc;
      }
      // otherwise only include errors for the target field and fields that are touched
      if (path === target) {
        acc[target] = issue.message;
        return acc;
      }
      // do not include other fields in the errors if the target is present
      return acc;
    }, {} as FormErrors<T>);
  }

  reset(): void {
    this.#data = {};
    this.#touched = new Set<keyof T>();
    this.#valid = true;
    this.#errors = undefined;
  }
}
