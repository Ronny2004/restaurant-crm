package com.restaurantcrm.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class UserProfile(
    val id: String,
    val email: String,
    val role: String,
    @SerialName("full_name")
    val fullName: String? = null
)