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

	# สำรองข้อมูลผ่าน API route (วิ่งในคอนเทนเนอร์ API)
backup:
	curl -fsS -X POST http://localhost:3001/api/admin/close-shop | jq .

restore-latest:
	curl -fsS -X POST http://localhost:3001/api/admin/restore-latest | jq .

# สำรองด้วย pg_dump ตรง ๆ จากโฮสต์ (เผื่อไม่อยากแตะ API)
backup-direct:
	mkdir -p $(BACKUPS)
	docker run --rm --network host -v $(BACKUPS):/out postgres:16 pg_dump \
	 -h 127.0.0.1 -p 5432 -U ${POSTGRES_USER} -d ${POSTGRES_DB} -Fc -f /out/backup_$$(date +%Y%m%d_%H%M%S).dump

# ดูไฟล์สำรองล่าสุด
ls-backups:
	@ls -lt $(BACKUPS) | head
