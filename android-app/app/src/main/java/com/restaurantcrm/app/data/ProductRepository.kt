package com.restaurantcrm.app.data

import com.restaurantcrm.app.data.model.Product
import io.github.jan.supabase.postgrest.from

class ProductRepository {

    private val client = SupabaseClient.client

    suspend fun getProducts(): List<Product> {
        return client.from("products").select().decodeList<Product>()
    }

    suspend fun createProduct(product: Product) {
        client.from("products").insert(product)
    }

    suspend fun updateProduct(id: String, product: Product) {
        client.from("products").update(product) {
            filter {
                eq("id", id)
            }
        }
    }

    suspend fun deleteProduct(id: String) {
        // Check for existence in order_items
        val items = client.from("order_items").select(columns = io.github.jan.supabase.postgrest.query.Columns.raw("id")) {
            filter {
                eq("product_id", id)
            }
            limit(1)
        }.decodeList<Map<String, String>>()

        if (items.isNotEmpty()) {
            throw Exception("No se puede eliminar este producto HISTORICO, comuniquese con el Administrador")
        }

        client.from("products").delete {
            filter {
                eq("id", id)
            }
        }
    }
}
