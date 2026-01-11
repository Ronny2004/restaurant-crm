package com.restaurantcrm.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Order(
    val id: String = "",
    val table_number: String,
    val status: String, // pending, ready, served, paid
    val total: Double,
    val items: List<OrderItem> = emptyList(),
    val created_at: String? = null
)

@Serializable
data class OrderItem(
    val product_id: String,
    val quantity: Int,
    val price: Double,
    val product: ProductPartial? = null
) {
    val productName: String
        get() = product?.name ?: "Desconocido"
}

@Serializable
data class ProductPartial(
    val name: String
)

// DTOs for Creation
@Serializable
data class CreateOrder(
    val table_number: String,
    val status: String,
    val total: Double
)

@Serializable
data class CreateOrderItem(
    val order_id: String,
    val product_id: String,
    val quantity: Int,
    val price: Double
)
