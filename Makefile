.PHONY: build up down logs ps api-sh db-sh seed

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=300

ps:
	docker compose ps

api-sh:
	docker exec -it pos-api sh

db-sh:
	docker exec -it pos-postgres psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-chamarodfai}

seed:
	# ถ้ามีสคริปต์ seed ในฝั่ง API ให้เรียกที่นี่ เช่น:
	# docker exec -it pos-api node dist/seed.js
	@echo "no seed script configured"
