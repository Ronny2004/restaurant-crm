package com.restaurantcrm.app.ui.chef

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.restaurantcrm.app.data.model.Order
import com.restaurantcrm.app.databinding.ItemChefOrderBinding

class ChefAdapter(
    private var orders: List<Order>,
    private val onMarkReady: (Order) -> Unit
) : RecyclerView.Adapter<ChefAdapter.ChefViewHolder>() {

    inner class ChefViewHolder(val binding: ItemChefOrderBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChefViewHolder {
        val binding = ItemChefOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ChefViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ChefViewHolder, position: Int) {
        val order = orders[position]
        holder.binding.apply {
            tvTableNumber.text = "Mesa #${order.table_number}"
            // tvTime.text = order.created_at // TODO: format nice time if needed

            val itemsText = order.items.joinToString("\n") { "${it.quantity}x ${it.productName}" }
            tvOrderItems.text = itemsText

            btnMarkReady.setOnClickListener { onMarkReady(order) }
        }
    }

    override fun getItemCount() = orders.size

    fun updateData(newOrders: List<Order>) {
        orders = newOrders
        notifyDataSetChanged()
    }
}
