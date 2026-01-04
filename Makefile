.PHONY: env start stop kill deps run rebuild

env:
	rm -rf .env

start:
	dfx start --background --clean

stop:
	dfx stop

kill:
	dfx killall

deps:
	dfx deps pull
	dfx deps init
	dfx deps deploy

run: start
	dfx deploy

rebuild: kill env start deps run