.PHONY: migrate run

migrate:
	uv run python manage.py makemigrations
	uv run python manage.py migrate

run:
	uv run python manage.py runserver
