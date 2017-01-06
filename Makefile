# workaround on macOS so we can adjust the path
SHELL := /bin/bash
# include node_modules in the path
PATH := ./node_modules/.bin:$(PATH)

test: unit lint
.PHONY: test

unit:
	mocha
.PHONY: unit

lint:
	eslint .
.PHONY: lint
