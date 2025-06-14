import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()

# --- Initialize Firebase Admin SDK ---
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
if not cred_path:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not set in .env or file not found.")
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase App Initialized or already running!")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    db = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class Product(BaseModel):
    productId: str
    name: str
    category: str
    typicalShelfLifeDays: int
    unit: str = "items"

class InventoryItemCreate(BaseModel):
    productId: str
    storeId: str = "walmart_001"
    quantity: int
    purchaseDate: str

class InventoryItem(InventoryItemCreate):
    inventoryItemId: str
    expiryDate: str
    status: str
    productName: str
    unit: str # <<<<<<<<<<<<<<<< MODIFIED HERE

class SurplusCrateItem(BaseModel):
    productId: str
    name: str
    quantity: int

class SurplusCrateCreate(BaseModel):
    storeId: str = "walmart_001"
    items: List[SurplusCrateItem]
    listingPrice: float
    pickupWindow: str = "Today 2 PM - 5 PM"

class SurplusCrate(SurplusCrateCreate):
    crateId: str
    status: str = "listed"
    listedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    soldToBusinessId: Optional[str] = None
    finalPrice: Optional[float] = None

class LocalBusinessCreate(BaseModel):
    name: str
    type: str
    address: str
    lat: float
    lng: float
    preferences: List[str] = []

class LocalBusiness(LocalBusinessCreate):
    businessId: str

class OfferCreate(BaseModel):
    businessId: str
    offerPrice: float

class Offer(OfferCreate):
    offerId: str
    status: str = "pending"
    offeredAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- Helper Functions ---
MOCK_PRODUCTS = {
    "prod_milk": Product(productId="prod_milk", name="Organic Milk", category="Dairy", typicalShelfLifeDays=7, unit="carton"),
    "prod_bread": Product(productId="prod_bread", name="Whole Wheat Bread", category="Bakery", typicalShelfLifeDays=5, unit="loaf"),
    "prod_apple": Product(productId="prod_apple", name="Apples", category="Produce", typicalShelfLifeDays=14, unit="kg"),
}

def calculate_expiry_date(purchase_date_str: str, shelf_life_days: int) -> str:
    try:
        purchase_date = datetime.strptime(purchase_date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid purchaseDate format. Use YYYY-MM-DD.")
    expiry_date = purchase_date + timedelta(days=shelf_life_days)
    return expiry_date.isoformat()

def get_inventory_status(expiry_date_str: str) -> str:
    try:
        expiry_date = datetime.fromisoformat(expiry_date_str)
    except ValueError:
        return "unknown_date_format"
    today = datetime.utcnow()
    days_to_expiry = (expiry_date.date() - today.date()).days
    if days_to_expiry < 0: return "expired"
    elif days_to_expiry < 3: return "atRisk"
    elif days_to_expiry < 7: return "nearingExpiry"
    return "fresh"

# --- API Endpoints ---
@app.get("/")
async def root():
    return {"message": "Welcome to WasteNot AI Backend! Firebase " + ("Connected." if db else "Connection FAILED.")}

@app.get("/api/products", response_model=List[Product])
async def get_products_list():
    return list(MOCK_PRODUCTS.values())

@app.post("/api/inventory_items", response_model=InventoryItem, status_code=201)
async def create_inventory_item(item_data: InventoryItemCreate):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    product = MOCK_PRODUCTS.get(item_data.productId)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product ID '{item_data.productId}' not found.")
    try:
        expiry_date = calculate_expiry_date(item_data.purchaseDate, product.typicalShelfLifeDays)
    except HTTPException as e: raise e
    status = get_inventory_status(expiry_date)
    new_item_ref = db.collection("inventoryItems").document()
    inventory_item_dict = item_data.dict()
    inventory_item_dict.update({
        "inventoryItemId": new_item_ref.id,
        "expiryDate": expiry_date,
        "status": status,
        "productName": product.name,
        "unit": product.unit # <<<<<<<<<<<<<<<< MODIFIED HERE
    })
    final_inventory_item = InventoryItem(**inventory_item_dict)
    new_item_ref.set(final_inventory_item.dict())
    return final_inventory_item

@app.get("/api/inventory_items/store/{store_id}/at-risk", response_model=List[InventoryItem])
async def get_at_risk_inventory(store_id: str):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    items_stream = db.collection("inventoryItems").where("storeId", "==", store_id).stream()
    at_risk_items = []
    for item_doc in items_stream:
        item_dict = item_doc.to_dict()
        item_dict["inventoryItemId"] = item_doc.id
        current_status = get_inventory_status(item_dict["expiryDate"])
        if item_dict["status"] != current_status: # Update only if changed
            item_dict["status"] = current_status
            db.collection("inventoryItems").document(item_doc.id).update({"status": current_status})

        # Add unit from MOCK_PRODUCTS
        parent_product_id = item_dict.get("productId")
        parent_product = MOCK_PRODUCTS.get(parent_product_id)
        if parent_product:
            item_dict["unit"] = parent_product.unit # <<<<<<<<<<<<<<<< MODIFIED HERE
        else:
            item_dict["unit"] = "unknown"
            print(f"Warning: Product {parent_product_id} not in MOCK_PRODUCTS for item {item_doc.id}")

        try:
            item = InventoryItem(**item_dict)
            if item.status in ["atRisk", "nearingExpiry", "expired"]:
                 at_risk_items.append(item)
        except Exception as e:
            print(f"Skipping item {item_doc.id} due to validation error: {e}, data: {item_dict}")
    return sorted(at_risk_items, key=lambda x: x.expiryDate)

# ... (SurplusCrate, LocalBusiness, Offer endpoints remain the same as your last correct version) ...
# === SURPLUS CRATE ENDPOINTS ===
@app.post("/api/surplus_crates", response_model=SurplusCrate, status_code=201)
async def create_surplus_crate(crate_data: SurplusCrateCreate):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    if not crate_data.items:
        raise HTTPException(status_code=400, detail="Surplus crate must contain at least one item.")
    new_crate_ref = db.collection("surplusCrates").document()
    surplus_crate_dict = crate_data.dict()
    surplus_crate_dict["crateId"] = new_crate_ref.id
    surplus_crate_dict["listedAt"] = datetime.utcnow().isoformat()
    surplus_crate_dict["status"] = "listed"
    surplus_crate_dict.setdefault("soldToBusinessId", None)
    surplus_crate_dict.setdefault("finalPrice", None)
    final_surplus_crate = SurplusCrate(**surplus_crate_dict)
    new_crate_ref.set(final_surplus_crate.dict())
    return final_surplus_crate

@app.get("/api/surplus_crates/store/{store_id}", response_model=List[SurplusCrate])
async def get_store_surplus_crates(store_id: str):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    crates_ref = db.collection("surplusCrates").where("storeId", "==", store_id).order_by("listedAt", direction=firestore.Query.DESCENDING).stream()
    crates_list = []
    for doc in crates_ref:
        crate_dict = doc.to_dict()
        crate_dict["crateId"] = doc.id
        crate_dict.setdefault("soldToBusinessId", None)
        crate_dict.setdefault("finalPrice", None)
        crates_list.append(SurplusCrate(**crate_dict))
    return crates_list

@app.get("/api/surplus_crates/available", response_model=List[SurplusCrate])
async def get_available_surplus_crates():
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    crates_ref = db.collection("surplusCrates").where("status", "==", "listed").order_by("listedAt", direction=firestore.Query.DESCENDING).stream()
    available_crates_list = []
    for doc in crates_ref:
        crate_dict = doc.to_dict()
        crate_dict["crateId"] = doc.id
        crate_dict.setdefault("soldToBusinessId", None)
        crate_dict.setdefault("finalPrice", None)
        available_crates_list.append(SurplusCrate(**crate_dict))
    return available_crates_list

# === LOCAL BUSINESS ENDPOINTS ===
@app.post("/api/local_businesses", response_model=LocalBusiness, status_code=201)
async def create_local_business(business_data: LocalBusinessCreate):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    new_biz_ref = db.collection("localBusinesses").document()
    biz_dict = business_data.dict()
    biz_dict["businessId"] = new_biz_ref.id
    final_biz = LocalBusiness(**biz_dict)
    new_biz_ref.set(final_biz.dict())
    return final_biz

# backend/main.py
# ... (other code remains the same) ...

@app.get("/api/local_businesses", response_model=List[LocalBusiness])
async def get_local_businesses_list():
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    businesses_ref = db.collection("localBusinesses").stream()
    
    processed_businesses = []
    for doc in businesses_ref:
        data = doc.to_dict()
        # Ensure the document ID from Firestore is used as the 'businessId'
        # for the Pydantic model. This overrides any 'businessId' that might
        # already be in 'data' from doc.to_dict(), preventing the error.
        data['businessId'] = doc.id 
        
        # Ensure all other required fields for LocalBusiness model are present,
        # with defaults if necessary (though your LocalBusiness model looks straightforward).
        # Example: data.setdefault('preferences', []) if preferences could be missing

        try:
            processed_businesses.append(LocalBusiness(**data))
        except Exception as e:
            print(f"Error validating/creating LocalBusiness Pydantic model for doc {doc.id}: {e}")
            print(f"Problematic data: {data}")
            continue # Skip this business and continue with the next
            
    return processed_businesses

# ... (rest of your main.py code) ...

# === OFFER ENDPOINTS ===
@app.post("/api/surplus_crates/{crate_id}/offers", response_model=Offer, status_code=201)
async def make_offer_on_crate(crate_id: str, offer_data: OfferCreate):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    crate_ref = db.collection("surplusCrates").document(crate_id)
    crate_doc = crate_ref.get()
    if not crate_doc.exists:
        raise HTTPException(status_code=404, detail="Crate not found")
    crate_status = crate_doc.to_dict().get("status")
    if crate_status != "listed" and crate_status != "offerReceived":
        raise HTTPException(status_code=400, detail=f"Crate is not available for offers (status: {crate_status})")
    offer_subcollection_ref = crate_ref.collection("offers")
    new_offer_doc_ref = offer_subcollection_ref.document()
    offer_dict = offer_data.dict()
    offer_dict["offerId"] = new_offer_doc_ref.id
    offer_dict["status"] = "pending"
    offer_dict["offeredAt"] = datetime.utcnow().isoformat()
    final_offer = Offer(**offer_dict)
    new_offer_doc_ref.set(final_offer.dict())
    if crate_status == "listed":
        crate_ref.update({"status": "offerReceived"})
    return final_offer

@app.get("/api/surplus_crates/{crate_id}/offers", response_model=List[Offer])
async def get_offers_for_crate(crate_id: str):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    crate_ref = db.collection("surplusCrates").document(crate_id)
    if not crate_ref.get().exists:
        raise HTTPException(status_code=404, detail="Crate not found")
    offers_query = crate_ref.collection("offers").order_by("offeredAt", direction=firestore.Query.DESCENDING)
    offers_stream = offers_query.stream()
    processed_offers = []
    for doc in offers_stream:
        data = doc.to_dict()
        data['offerId'] = doc.id
        data.setdefault('status', 'pending')
        data.setdefault('offeredAt', datetime.utcnow().isoformat())
        try:
            processed_offers.append(Offer(**data))
        except Exception as e:
            print(f"Error validating/creating Offer Pydantic model for doc {doc.id}: {e}\nData: {data}")
            continue
    return processed_offers

@app.put("/api/surplus_crates/{crate_id}/offers/{offer_id}/respond", response_model=Offer)
async def respond_to_offer(crate_id: str, offer_id: str, response_status: str):
    if not db: raise HTTPException(status_code=503, detail="Firebase not connected")
    if response_status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid response status. Must be 'accepted' or 'rejected'.")

    crate_ref = db.collection("surplusCrates").document(crate_id)
    offer_ref = crate_ref.collection("offers").document(offer_id)
    
    crate_doc_snapshot = crate_ref.get()
    offer_doc_snapshot = offer_ref.get()

    if not crate_doc_snapshot.exists: raise HTTPException(status_code=404, detail="Crate not found")
    if not offer_doc_snapshot.exists: raise HTTPException(status_code=404, detail="Offer not found")
    
    current_offer_data = offer_doc_snapshot.to_dict()
    current_offer_status = current_offer_data.get("status")
    if current_offer_status != "pending":
        raise HTTPException(status_code=400, detail=f"Offer is not pending (status: {current_offer_status})")

    # Start Firestore transaction for atomicity (optional but recommended for production)
    # For prototype, we'll do sequential updates.
    # transaction = db.transaction()
    # @firestore.transactional
    # async def update_in_transaction(transaction, crate_ref, offer_ref, ....):
    #    # all reads and writes using transaction object
    
    # Perform the update to the offer status in Firestore
    offer_ref.update({"status": response_status})
    
    if response_status == "accepted":
        crate_data_for_inventory_update = crate_doc_snapshot.to_dict() # Get crate data before updating its status

        # Update crate status to "sold" and store buyer info
        crate_ref.update({
            "status": "sold",
            "soldToBusinessId": current_offer_data.get("businessId"),
            "finalPrice": current_offer_data.get("offerPrice")
        })

        # --- BEGIN INVENTORY ADJUSTMENT LOGIC ---
        try:
            crate_items_sold = crate_data_for_inventory_update.get("items", [])
            store_id_of_crate = crate_data_for_inventory_update.get("storeId")

            print(f"--- Inventory Adjustment Started for Crate: {crate_id} ---")
            print(f"Store ID: {store_id_of_crate}, Items in Sold Crate: {crate_items_sold}")

            if store_id_of_crate and crate_items_sold:
                for sold_item_details in crate_items_sold:
                    product_id_to_adjust = sold_item_details.get("productId")
                    quantity_sold_from_crate = sold_item_details.get("quantity", 0)

                    if not product_id_to_adjust or quantity_sold_from_crate <= 0:
                        print(f"  Skipping adjustment for invalid item data: {sold_item_details}")
                        continue

                    print(f"  Processing sold item: Product ID {product_id_to_adjust}, Quantity Sold: {quantity_sold_from_crate}")

                    # Query for inventory items of this product in the specific store,
                    # ordered by expiryDate to decrement from the oldest stock first.
                    # This query REQUIRES a composite index in Firestore on inventoryItems:
                    # Fields: productId (ASC/DESC), storeId (ASC/DESC), quantity (>, ASC/DESC), expiryDate (ASC)
                    inventory_items_query = db.collection("inventoryItems") \
                        .where("productId", "==", product_id_to_adjust) \
                        .where("storeId", "==", store_id_of_crate) \
                        .where("quantity", ">", 0) \
                        .order_by("expiryDate", direction=firestore.Query.ASCENDING)
                    
                    inventory_batches_stream = inventory_items_query.stream()
                    
                    remaining_quantity_to_decrement = quantity_sold_from_crate
                    adjusted_from_any_batch = False

                    for inv_batch_doc in inventory_batches_stream:
                        if remaining_quantity_to_decrement <= 0:
                            break # All sold quantity for this product type has been accounted for

                        inv_batch_data = inv_batch_doc.to_dict()
                        current_batch_quantity = inv_batch_data.get("quantity", 0)
                        
                        print(f"    Found inventory batch: {inv_batch_doc.id} (Product: {product_id_to_adjust}), Current Qty: {current_batch_quantity}")

                        if current_batch_quantity >= remaining_quantity_to_decrement:
                            # This batch can cover the remaining sold quantity (or more)
                            new_batch_quantity = current_batch_quantity - remaining_quantity_to_decrement
                            inv_batch_doc.reference.update({"quantity": new_batch_quantity})
                            print(f"      Decremented batch {inv_batch_doc.id} by {remaining_quantity_to_decrement}. New Qty: {new_batch_quantity}")
                            remaining_quantity_to_decrement = 0
                            adjusted_from_any_batch = True
                            break # Done with this product from the crate
                        else:
                            # This batch will be fully depleted
                            inv_batch_doc.reference.update({"quantity": 0})
                            remaining_quantity_to_decrement -= current_batch_quantity
                            print(f"      Depleted batch {inv_batch_doc.id} (Used: {current_batch_quantity}). Still need to decrement: {remaining_quantity_to_decrement}")
                            adjusted_from_any_batch = True
                    
                    if not adjusted_from_any_batch:
                        print(f"  WARNING: No matching inventory batches with quantity > 0 found for Product ID {product_id_to_adjust} in store {store_id_of_crate}.")
                    elif remaining_quantity_to_decrement > 0:
                        print(f"  WARNING: Could not fully decrement inventory for Product ID {product_id_to_adjust}. Amount sold from crate: {quantity_sold_from_crate}. Amount remaining unadjusted: {remaining_quantity_to_decrement} (likely insufficient stock across all batches).")
            
            print(f"--- Inventory Adjustment Finished for Crate: {crate_id} ---")

        except Exception as e_inv_adj:
            # Log this error but don't let it break the main offer response flow if possible
            print(f"CRITICAL ERROR during inventory adjustment for crate {crate_id}: {e_inv_adj}")
        # --- END INVENTORY ADJUSTMENT LOGIC ---

        # Auto-reject other pending offers for this crate
        other_offers_query = crate_ref.collection("offers").where("status", "==", "pending")
        for other_offer_doc_snapshot in other_offers_query.stream():
            if other_offer_doc_snapshot.id != offer_id:
                other_offer_doc_snapshot.reference.update({"status": "rejected"})
    
    # Fetch the offer document AGAIN after all updates to get its latest state for the response
    updated_offer_doc_snapshot = offer_ref.get()
    if not updated_offer_doc_snapshot.exists:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated offer details after processing.")

    response_data = updated_offer_doc_snapshot.to_dict()
    response_data['offerId'] = updated_offer_doc_snapshot.id # Ensure correct ID for Pydantic model

    # Ensure all other fields required by Pydantic 'Offer' model are present for robustness
    response_data.setdefault('status', response_status) # Should be accurate from the update
    response_data.setdefault('offeredAt', current_offer_data.get('offeredAt', datetime.utcnow().isoformat())) # Keep original
    response_data.setdefault('businessId', current_offer_data.get('businessId')) # Keep original
    response_data.setdefault('offerPrice', current_offer_data.get('offerPrice')) # Keep original

    try:
        return Offer(**response_data)
    except Exception as e_resp:
        print(f"Error creating Pydantic Offer model for response: {e_resp}, data: {response_data}")
        raise HTTPException(status_code=500, detail=f"Error preparing response data: {e_resp}")
    
# naman@DESKTOP-A9LSRBI MINGW64 ~/Desktop/Walmart Sparkathon
# $ cd backend/

# naman@DESKTOP-A9LSRBI MINGW64 ~/Desktop/Walmart Sparkathon/backend
# $ source venv/Scripts/activate
# (venv) 
# naman@DESKTOP-A9LSRBI MINGW64 ~/Desktop/Walmart Sparkathon/backend
# $ uvicorn main:app --reload