package com.restaurantcrm.app.data

import com.restaurantcrm.app.data.model.Order
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order as PostgrestOrder

class OrderRepository {

    private val client = SupabaseClient.client

    suspend fun getOrders(): List<Order> {
        val columns = Columns.raw("*, items:order_items(*, product:products(name))")
        return client.from("orders").select(columns = columns) {
            order("created_at", order = PostgrestOrder.DESCENDING)
        }.decodeList<Order>()
    }

    suspend fun createOrder(order: Order) {
        // 1. Create Order
        val createOrderDto = com.restaurantcrm.app.data.model.CreateOrder(
            table_number = order.table_number,
            status = order.status,
            total = order.total
        )
        val insertedOrder = client.from("orders").insert(createOrderDto) {
            select() // Return the created object
        }.decodeSingle<Order>()

        // 2. Create Order Items
        val itemsDto = order.items.map { item ->
            com.restaurantcrm.app.data.model.CreateOrderItem(
                order_id = insertedOrder.id,
                product_id = item.product_id,
                quantity = item.quantity,
                price = item.price
            )
        }
        client.from("order_items").insert(itemsDto)
    }

    suspend fun updateOrderStatus(id: String, status: String) {
        client.from("orders").update(mapOf("status" to status)) {
            filter {
                eq("id", id)
            }
        }
    }
}
