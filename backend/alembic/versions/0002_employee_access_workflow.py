"""Add HR approval state for employee access."""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role", "users", "role IN ('CORPORATE','HR_ADMIN','ADMIN','EMPLOYEE')"
    )
    op.alter_column("users", "employee_code", existing_type=sa.String(24), nullable=True)
    op.add_column(
        "users",
        sa.Column("approval_status", sa.String(16), nullable=False, server_default="APPROVED"),
    )


def downgrade() -> None:
    op.drop_column("users", "approval_status")
    op.alter_column("users", "employee_code", existing_type=sa.String(24), nullable=False)
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role IN ('ADMIN','EMPLOYEE')")