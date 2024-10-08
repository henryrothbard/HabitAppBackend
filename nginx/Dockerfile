FROM nginx:alpine

ARG ENVIRONMENT=development
ARG DOMAIN=localhost
ARG EMAIL

COPY ./*.conf /usr/local/etc/nginx/

COPY ./init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

ENV ENVIRONMENT=${ENVIRONMENT}
ENV DOMAIN=${DOMAIN}
ENV EMAIL=${EMAIL}

CMD ["sh", "/usr/local/bin/init.sh", "${ENVIRONMENT}", "${DOMAIN}", "${EMAIL}"]