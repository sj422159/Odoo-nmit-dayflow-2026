"""Create employee profiles for existing HR and admin accounts."""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        INSERT INTO employees (
            user_id, first_name, last_name, department, designation,
            employment_type, date_of_joining, created_at, updated_at
        )
        SELECT
            u.id,
            COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'HR'),
            'Administrator',
            'Unassigned',
            'HR Administrator',
            'FULL_TIME',
            CURRENT_DATE,
            NOW(),
            NOW()
        FROM users u
        LEFT JOIN employees e ON e.user_id = u.id
        WHERE u.role IN ('HR_ADMIN', 'ADMIN') AND e.id IS NULL
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        DELETE FROM employees e
        USING users u
        WHERE e.user_id = u.id
          AND u.role IN ('HR_ADMIN', 'ADMIN')
          AND e.designation = 'HR Administrator'
    """))