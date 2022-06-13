include .env

build:
	bash ./.github/scripts/build.sh

run-firefox:
	bash ./.github/scripts/run-firefox.sh

sign-firefox:
	export JWT_USER=$(JWT_USER) && \
	export JWT_SECRET=$(JWT_SECRET) && \
	bash ./.github/scripts/sign-firefox.sh
