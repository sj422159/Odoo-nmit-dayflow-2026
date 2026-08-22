"""Add department records and department-scoped employee IDs."""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("code", sa.String(8), nullable=False, unique=True),
        sa.Column("next_employee_number", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column("employees", sa.Column("department_id", sa.Integer, nullable=True))
    op.create_index("ix_employees_department_id", "employees", ["department_id"])
    op.create_foreign_key("fk_employees_department_id", "employees", "departments", ["department_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_employees_department_id", "employees", type_="foreignkey")
    op.drop_index("ix_employees_department_id", table_name="employees")
    op.drop_column("employees", "department_id")
    op.drop_table("departments")