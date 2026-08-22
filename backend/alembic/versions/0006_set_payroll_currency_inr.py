"""Use INR consistently for payroll."""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE salary_structures SET currency = 'INR' WHERE currency <> 'INR'"))
    op.execute(sa.text("UPDATE payslips SET currency = 'INR' WHERE currency <> 'INR'"))
    op.alter_column("salary_structures", "currency", server_default="INR")
    op.alter_column("payslips", "currency", server_default="INR")


def downgrade() -> None:
    op.alter_column("salary_structures", "currency", server_default="USD")
    op.alter_column("payslips", "currency", server_default="USD")