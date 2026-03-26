from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import supabase
from ..models import ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects(user: dict = Depends(get_current_user)):
    result = supabase.table("projects").select("*").eq("owner_id", user["id"]).order("created_at").execute()
    return result.data


@router.get("/{project_id}")
def get_project(project_id: str, user: dict = Depends(get_current_user)):
    result = supabase.table("projects").select("*").eq("id", project_id).eq("owner_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data


@router.post("")
def create_project(project: ProjectCreate, user: dict = Depends(get_current_user)):
    data = project.model_dump()
    data["owner_id"] = user["id"]
    result = supabase.table("projects").insert(data).execute()
    return result.data[0]


@router.put("/{project_id}")
def update_project(project_id: str, project: ProjectUpdate, user: dict = Depends(get_current_user)):
    data = project.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        supabase.table("projects")
        .update(data)
        .eq("id", project_id)
        .eq("owner_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/{project_id}")
def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    # Delete tasks first
    supabase.table("tasks").delete().eq("project_id", project_id).execute()
    result = supabase.table("projects").delete().eq("id", project_id).eq("owner_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}
