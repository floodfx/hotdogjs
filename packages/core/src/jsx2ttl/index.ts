// TODO try jsx2ttl some other time

// import { Expression, JSXAttribute, SpreadElement, booleanLiteral, stringLiteral } from "@babel/types";
// import { JSXElementParentMetadata, Jsx2TtlError } from "jsx2ttl/dist";

// /**
//  * Marks a function as a component if it returns JSX or a class that extends Component
//  * @param parentData
//  * @returns
//  */
// export function callWithAdditionalArgsFn(parentData: JSXElementParentMetadata): (SpreadElement | Expression)[] {
//   switch (parentData.type) {
//     case "class":
//       console.log("class", parentData);
//       // any class that implements Component should be marked as a component
//       if (parentData.interfaces.includes("Component")) {
//         return [booleanLiteral(true)];
//       }
//       // any class that extends JSXBaseComponent should be marked as a component
//       if (parentData.superClasses.includes("BaseJSXComponent")) {
//         return [booleanLiteral(true)];
//       }
//       return [];
//     case "function":
//       // any function that returns JSX should be marked as a component, not a view
//       return [booleanLiteral(true)];
//     default:
//       return [];
//   }
// }

// /**
//  * Transforms `className` to `class` and `style` to css style string
//  * @param attribute
//  * @returns
//  */
// export function transformAttribute(attribute: JSXAttribute): JSXAttribute {
//   const name = attribute.name.name;
//   if (name === "className") {
//     console.log("className", attribute);
//     return {
//       ...attribute,
//       name: {
//         ...attribute.name,
//         name: "class",
//       },
//     } as JSXAttribute;
//   } else if (name === "style") {
//     // if value is an object convert to css style string
//     // transforming camelCase to kebab-case
//     switch (attribute.value?.type) {
//       case "JSXExpressionContainer":
//         const expression = attribute.value.expression;
//         if (expression.type === "ObjectExpression") {
//           // transform key/value pairs to css style string
//           const properties = expression.properties.map((prop) => {
//             if (prop.type !== "ObjectProperty") {
//               throw new Jsx2TtlError("style object must have key value pairs", prop);
//             }
//             console.log("key", prop.key, "value", prop.value);
//             let key = "";
//             let value;
//             switch (prop.key.type) {
//               case "Identifier":
//                 key = prop.key.name;
//                 break;
//               case "StringLiteral":
//                 key = prop.key.value;
//                 break;
//               default:
//                 throw new Jsx2TtlError("style object keys must be string or identifier", prop.key);
//             }
//             switch (prop.value.type) {
//               case "StringLiteral":
//               case "NumericLiteral":
//               case "BooleanLiteral":
//                 value = prop.value.value;
//                 break;
//               case "TemplateLiteral":
//                 value = prop.value.quasis[0].value.raw;
//                 break;
//               case "Identifier":
//                 value = prop.value.name;
//                 break;
//               default:
//                 throw new Jsx2TtlError("unsupported style value type", prop.value);
//             }
//             return `${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}: ${value};`;
//           });
//           return {
//             ...attribute,
//             value: stringLiteral(properties.join(" ")),
//           };
//         }
//         break;
//       default:
//         return attribute;
//     }
//   }

//   return attribute;
// }
