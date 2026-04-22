.PHONY: migrate run-back run-front install-back install-front

# Backend
migrate:
	$(MAKE) -C backend migrate

run-back:
	$(MAKE) -C backend run

install-back:
	cd backend && uv sync

# Frontend
run-front:
	cd frontend && npm run dev

install-front:
	cd frontend && npm install
