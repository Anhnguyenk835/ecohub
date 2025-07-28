from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.field.field_model import FieldCreate, FieldUpdate, FieldResponse
from app.field.field_service import FieldService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Create router for field endpoints
router = APIRouter(prefix="/fields", tags=["fields"])

# Initialize field service
field_service = FieldService()

@router.post("/", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(field_data: FieldCreate):
    """
    Create a new field.
    
    Args:
        field_data (FieldCreate): Field data to create
        
    Returns:
        FieldResponse: Created field data
    """
    try:
        field_dict = field_data.dict()
        field_id = await field_service.create_field(field_dict)
        
        if field_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create field"
            )
        
        # Retrieve the created field to return complete data
        created_field = await field_service.get_field(field_id)
        if created_field is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created field"
            )
        
        return FieldResponse(**created_field)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_field endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{field_id}", response_model=FieldResponse)
async def get_field(field_id: str):
    """
    Get a field by ID.
    
    Args:
        field_id (str): Field ID to retrieve
        
    Returns:
        FieldResponse: Field data
    """
    try:
        field = await field_service.get_field(field_id)
        
        if field is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field with ID {field_id} not found"
            )
        
        return FieldResponse(**field)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_field endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[FieldResponse])
async def get_all_fields(limit: Optional[int] = None):
    """
    Get all fields.
    
    Args:
        limit (Optional[int]): Maximum number of fields to retrieve
        
    Returns:
        List[FieldResponse]: List of field data
    """
    try:
        fields = await field_service.get_all_fields(limit=limit)
        return [FieldResponse(**field) for field in fields]
        
    except Exception as e:
        logger.error(f"Error in get_all_fields endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{field_id}", response_model=FieldResponse)
async def update_field(field_id: str, field_data: FieldUpdate):
    """
    Update a field.
    
    Args:
        field_id (str): Field ID to update
        field_data (FieldUpdate): Field data to update
        
    Returns:
        FieldResponse: Updated field data
    """
    try:
        # Check if field exists
        existing_field = await field_service.get_field(field_id)
        if existing_field is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field with ID {field_id} not found"
            )
        
        # Only include non-None values in update
        update_dict = field_data.dict(exclude_unset=True)
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided for update"
            )
        
        success = await field_service.update_field(field_id, update_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update field"
            )
        
        # Retrieve the updated field
        updated_field = await field_service.get_field(field_id)
        if updated_field is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated field"
            )
        
        return FieldResponse(**updated_field)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_field endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(field_id: str):
    """
    Delete a field.
    
    Args:
        field_id (str): Field ID to delete
    """
    try:
        # Check if field exists
        existing_field = await field_service.get_field(field_id)
        if existing_field is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field with ID {field_id} not found"
            )
        
        success = await field_service.delete_field(field_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete field"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_field endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )