# Makefile for PostgreSQL Docker
# Path: /home/ubuntu/pos_server/database/Makefile

IMAGE_NAME = pos-postgres
CONTAINER_NAME = pos-postgres
DB_USER = postgres
DB_PASSWORD = chamarodfai101
DB_NAME = chamarodfai
DATA_DIR = $(HOME)/docker/pgdata
DB_HOST ?= 127.0.0.1
DB_PORT ?= 5432

.PHONY: build run stop rm logs psql

db-init:
	@echo "Applying schema to $(DB_NAME) on $(DB_HOST):$(DB_PORT)"
	@DB_HOST=$(DB_HOST) DB_PORT=$(DB_PORT) DB_NAME=$(DB_NAME) \
	PGHOST=$(DB_HOST) PGPORT=$(DB_PORT) PGDATABASE=$(DB_NAME) \
	PGUSER_SUPER=$(DB_SUPER_USER) PGPASS_SUPER=$(DB_SUPER_PASS) \
	PGUSER_APP=$(DB_APP_USER)   PGPASS_APP=$(DB_APP_PASS) \
	node init_db.mjs

# Build custom postgres image
build:
	docker build -t $(IMAGE_NAME):latest .

# Run container
run:
	docker run -d --name $(CONTAINER_NAME) \
		-e POSTGRES_USER=$(DB_USER) \
		-e POSTGRES_PASSWORD=$(DB_PASSWORD) \
		-e POSTGRES_DB=$(DB_NAME) \
		-v $(DATA_DIR):/var/lib/postgresql/data \
		-p 5432:5432 \
		$(IMAGE_NAME):latest

# Stop container
stop:
	docker stop $(CONTAINER_NAME)

# Remove container
rm:
	docker rm -f $(CONTAINER_NAME)

# View logs
logs:
	docker logs -f $(CONTAINER_NAME)

# Enter psql shell
psql:
	docker exec -it $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME)
