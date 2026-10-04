use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct VoucherItem {
    pub product_id: i32,
    pub product_name: String,
    pub quantity: i32,
}

#[derive(Debug, Deserialize)]
pub struct SetVouchers {
    pub quantity: i32,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Activation {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub activated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ActivationItem {
    pub id: i32,
    pub product_id: i32,
    pub product_name: String,
    pub activated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ActivateResponse {
    pub remaining: i32,
    pub activation: Activation,
}