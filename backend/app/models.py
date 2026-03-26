from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TaskStatus(str, Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, Enum):
    urgent = "urgent"
    not_urgent = "not_urgent"


class TaskImportance(str, Enum):
    important = "important"
    not_important = "not_important"


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.not_urgent
    importance: TaskImportance = TaskImportance.not_important
    project_id: str
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    importance: Optional[TaskImportance] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    position: int
