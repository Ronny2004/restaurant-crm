package com.restaurantcrm.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: String = "",
    val name: String,
    val category: String,
    val price: Double,
    val stock: Int = 0,
    val created_at: String? = null
)
