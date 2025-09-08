# Lightweight build for three-agent research system
FROM public.ecr.aws/lambda/python:3.11-x86_64

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt

# Install dependencies (streamlined)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy application code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY backend_lambda.py ${LAMBDA_TASK_ROOT}
COPY enhanced_research_system.py ${LAMBDA_TASK_ROOT}
COPY main.py ${LAMBDA_TASK_ROOT}
COPY config.py ${LAMBDA_TASK_ROOT}

# Copy directories
COPY agents/ ${LAMBDA_TASK_ROOT}/agents/
COPY utils/ ${LAMBDA_TASK_ROOT}/utils/
COPY tools/ ${LAMBDA_TASK_ROOT}/tools/

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]