# Makefile for PostgreSQL Docker
# Path: /home/ubuntu/pos_server/database/Makefile

IMAGE_NAME = pos-postgres
CONTAINER_NAME = pos-postgres
DB_USER = postgres
DB_PASSWORD = chamarodfai101
DB_NAME = chamarodfai
DATA_DIR = $(HOME)/docker/pgdata

.PHONY: build run stop rm logs psql

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
