from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..auth import get_current_user
from ..database import supabase
from ..models import TaskCreate, TaskUpdate, TaskStatusUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def enrich_tasks(tasks: list) -> list:
    """Add project info to each task."""
    if not tasks:
        return tasks
    project_ids = list({t["project_id"] for t in tasks if t.get("project_id")})
    if project_ids:
        projects_result = supabase.table("projects").select("*").in_("id", project_ids).execute()
        projects_map = {p["id"]: p for p in projects_result.data}
        for task in tasks:
            task["project"] = projects_map.get(task.get("project_id"))
    return tasks


@router.get("")
def list_tasks(
    project_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    query = supabase.table("tasks").select("*")
    if project_id:
        query = query.eq("project_id", project_id)

    # Get tasks from user's projects
    projects = supabase.table("projects").select("id").eq("owner_id", user["id"]).execute()
    project_ids = [p["id"] for p in projects.data]
    if not project_ids:
        return []

    result = query.in_("project_id", project_ids).order("position").execute()
    return enrich_tasks(result.data)


@router.get("/{task_id}")
def get_task(task_id: str, user: dict = Depends(get_current_user)):
    result = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return enrich_tasks([result.data])[0]


@router.post("")
def create_task(task: TaskCreate, user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = supabase.table("projects").select("id").eq("id", task.project_id).eq("owner_id", user["id"]).execute()
    if not project.data:
        raise HTTPException(status_code=403, detail="Not your project")

    # Get next position
    existing = (
        supabase.table("tasks")
        .select("position")
        .eq("project_id", task.project_id)
        .eq("status", task.status)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    next_position = (existing.data[0]["position"] + 1) if existing.data else 0

    data = task.model_dump()
    data["position"] = next_position
    result = supabase.table("tasks").insert(data).execute()
    return enrich_tasks(result.data)[0]


@router.put("/{task_id}")
def update_task(task_id: str, task: TaskUpdate, user: dict = Depends(get_current_user)):
    data = task.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("tasks").update(data).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return enrich_tasks(result.data)[0]


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, update: TaskStatusUpdate, _user: dict = Depends(get_current_user)):
    result = (
        supabase.table("tasks")
        .update({"status": update.status, "position": update.position})
        .eq("id", task_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.delete("/{task_id}")
def delete_task(task_id: str, _user: dict = Depends(get_current_user)):
    result = supabase.table("tasks").delete().eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
