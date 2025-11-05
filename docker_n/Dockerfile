FROM node:20-alpine

RUN apk add --no-cache \
	bash \
	curl \
	libc6-compat \
	vips \
	vips-dev \
	python3 \
	make \
	g++

WORKDIR /application

CMD ["tail", "-f", "/dev/null"]
