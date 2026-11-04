"""
CodeSense AI — ORM model registry.
by Nitish Singh

Importing this package registers every mapper on ``Base.metadata`` so that
``Base.metadata.create_all`` (see ``db.init_db``) sees the full schema.
"""

from models.base import Base
from models.review import ReviewRecord
from models.user import User

__all__ = ["Base", "User", "ReviewRecord"]
