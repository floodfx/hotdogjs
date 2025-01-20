FROM public.ecr.aws/lambda/provided:al2023
COPY . ${LAMBDA_TASK_ROOT}
# ENTRYPOINT [ "./index.ts" ]
ENTRYPOINT [ "./node_modules/hotdogjs/src/server/start.ts" ]
