"""Idempotently load clearly labelled demonstration catalogue records."""

from database import IS_SQLITE, seed_demo_data


def main() -> None:
    seed_demo_data()
    database_kind = "SQLite" if IS_SQLITE else "PostgreSQL"
    print(f"Demo catalogue seed is current in {database_kind}.")


if __name__ == "__main__":
    main()
