"""Separate corporate and HR administrator permissions."""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role", "users", "role IN ('CORPORATE','HR_ADMIN','ADMIN','EMPLOYEE')"
    )
    op.execute("UPDATE users SET role = 'HR_ADMIN' WHERE role = 'ADMIN'")
    op.execute("UPDATE users SET role = 'CORPORATE' WHERE lower(email) = 'admin@gmail.com'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role IN ('CORPORATE','HR_ADMIN')")
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role IN ('ADMIN','EMPLOYEE')")