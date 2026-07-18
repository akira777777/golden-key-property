"""add server-side admin sessions

Revision ID: 8a31d86c2f14
Revises: 4489344615a9
Create Date: 2026-07-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a31d86c2f14"
down_revision: Union[str, Sequence[str], None] = "4489344615a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_sessions",
        sa.Column("id_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("csrf_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_hash"),
    )
    op.create_index("ix_admin_sessions_expiry", "admin_sessions", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_sessions_expiry", table_name="admin_sessions")
    op.drop_table("admin_sessions")
