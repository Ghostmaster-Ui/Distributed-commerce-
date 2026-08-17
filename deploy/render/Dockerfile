FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

WORKDIR /app
COPY deploy/render/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY gateway/package.json gateway/package-lock.json ./gateway/
RUN cd gateway && npm ci --omit=dev

COPY gateway ./gateway
COPY services ./services
COPY deploy/render/start.sh /usr/local/bin/start-meridian

RUN chmod +x /usr/local/bin/start-meridian

EXPOSE 10000
CMD ["start-meridian"]
