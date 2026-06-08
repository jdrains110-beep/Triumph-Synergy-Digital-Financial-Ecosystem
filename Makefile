# Triumph-Synergy — convenience targets for the triumph-app deploy line.
# Permanent shortcuts so updates are always one command.

SHELL := /bin/bash
SCRIPT := ./scripts/deploy-app.sh

.PHONY: deploy fast hard full status help

help:
	@echo "Triumph-Synergy deploy targets:"
	@echo "  make deploy   — build + recreate triumph-app + verify (default)"
	@echo "  make fast     — recreate triumph-app only (no rebuild)"
	@echo "  make hard     — full rebuild without cache, then recreate"
	@echo "  make full     — up -d every service, then build + recreate app"
	@echo "  make status   — print live ecosystem state"

deploy:
	$(SCRIPT)

fast:
	$(SCRIPT) fast

hard:
	$(SCRIPT) hard

full:
	$(SCRIPT) full

status:
	$(SCRIPT) status
