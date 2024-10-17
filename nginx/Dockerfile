FROM nginx:alpine

COPY ./*.conf /usr/local/etc/nginx/

COPY ./init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

RUN apk add --no-cache bash

RUN /bin/bash -c PORT=${PORT}

CMD /usr/local/bin/init.sh ${ENVIRONMENT} ${DOMAIN} ${EMAIL}
