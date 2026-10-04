mod models;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use models::*;
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL не задан в .env");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("не удалось подключиться к базе");
    
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("не удалось применить миграции");

    let app = Router::new()
        .route("/users", get(list_users))
        .route("/products", get(list_products))
        .route("/users/{user_id}/vouchers", get(list_user_vouchers))
        .route("/users/{user_id}/products/{product_id}/activate", post(activate))
        .route("/users/{user_id}/activations", get(list_user_activations))
        .route(
            "/admin/users/{user_id}/products/{product_id}/vouchers",
            put(set_vouchers),
        )
        .layer(CorsLayer::permissive()) // для разработки; React на другом порту
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Сервер: http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

enum AppError {
    BadRequest(&'static str),
    NotFound(&'static str),
    Conflict(&'static str),
    Internal,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m),
            AppError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Внутренняя ошибка сервера"),
        };
        (status, Json(ErrorBody { error: message.to_string() })).into_response()
    }
}

// Благодаря этому оператор `?` сам превращает ошибку БД в AppError::Internal
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        eprintln!("Ошибка БД: {e}");
        AppError::Internal
    }
}

async fn list_users(State(pool): State<PgPool>) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as::<_, User>("SELECT * FROM users ORDER BY id")
        .fetch_all(&pool)
        .await?;
    Ok(Json(users))
}

async fn list_products(State(pool): State<PgPool>) -> Result<Json<Vec<Product>>, AppError> {
    let products = sqlx::query_as::<_, Product>("SELECT * FROM products ORDER BY id")
        .fetch_all(&pool)
        .await?;
    Ok(Json(products))
}

async fn list_user_vouchers(
    State(pool): State<PgPool>,
    Path(user_id): Path<i32>,
) -> Result<Json<Vec<VoucherItem>>, AppError> {
    let items = sqlx::query_as::<_, VoucherItem>(
        "SELECT p.id AS product_id,
                p.name AS product_name,
                COALESCE(v.quantity, 0) AS quantity
         FROM products p
         LEFT JOIN user_vouchers v
                ON v.product_id = p.id AND v.user_id = $1
         ORDER BY p.id",
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(items))
}

async fn set_vouchers(
    State(pool): State<PgPool>,
    Path((user_id, product_id)): Path<(i32, i32)>,
    Json(input): Json<SetVouchers>,
) -> Result<Json<VoucherItem>, AppError> {
    if input.quantity < 0 {
        return Err(AppError::BadRequest("Количество не может быть отрицательным"));
    }

    let result = sqlx::query_as::<_, VoucherItem>(
        "WITH upserted AS (
             INSERT INTO user_vouchers (user_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET quantity = EXCLUDED.quantity
             RETURNING product_id, quantity
         )
         SELECT u.product_id, p.name AS product_name, u.quantity
         FROM upserted u JOIN products p ON p.id = u.product_id",
    )
    .bind(user_id)
    .bind(product_id)
    .bind(input.quantity)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(item) => Ok(Json(item)),
        Err(e) if e.as_database_error().is_some_and(|d| d.is_foreign_key_violation()) => {
            Err(AppError::NotFound("Пользователь или продукт не найден"))
        }
        Err(e) => Err(e.into()),
    }
}

async fn activate(
    State(pool): State<PgPool>,
    Path((user_id, product_id)): Path<(i32, i32)>,
) -> Result<Json<ActivateResponse>, AppError> {
    let mut tx = pool.begin().await?;

    let remaining: Option<i32> = sqlx::query_scalar(
        "UPDATE user_vouchers
         SET quantity = quantity - 1
         WHERE user_id = $1 AND product_id = $2 AND quantity > 0
         RETURNING quantity",
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(remaining) = remaining else {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)
                AND EXISTS(SELECT 1 FROM products WHERE id = $2)",
        )
        .bind(user_id)
        .bind(product_id)
        .fetch_one(&mut *tx)
        .await?;

        return Err(if exists {
            AppError::Conflict("Ваучеров на этот продукт не осталось")
        } else {
            AppError::NotFound("Пользователь или продукт не найден")
        });
    };

    let activation = sqlx::query_as::<_, Activation>(
        "INSERT INTO activations (user_id, product_id) VALUES ($1, $2) RETURNING *",
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(ActivateResponse { remaining, activation }))
}

async fn list_user_activations(
    State(pool): State<PgPool>,
    Path(user_id): Path<i32>,
) -> Result<Json<Vec<ActivationItem>>, AppError> {
    let items = sqlx::query_as::<_, ActivationItem>(
        "SELECT a.id, a.product_id, p.name AS product_name, a.activated_at
         FROM activations a
         JOIN products p ON p.id = a.product_id
         WHERE a.user_id = $1
         ORDER BY a.activated_at DESC, a.id DESC",
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(items))
}