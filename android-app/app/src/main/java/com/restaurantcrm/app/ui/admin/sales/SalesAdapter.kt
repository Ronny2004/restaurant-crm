package com.restaurantcrm.app.ui.admin.sales

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.restaurantcrm.app.data.model.Order
import com.restaurantcrm.app.databinding.ItemCashierOrderBinding

class SalesAdapter(
    private var orders: List<Order>
) : RecyclerView.Adapter<SalesAdapter.SalesViewHolder>() {

    // Reusing Cashier Item Layout but hiding button
    inner class SalesViewHolder(val binding: ItemCashierOrderBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SalesViewHolder {
        val binding = ItemCashierOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return SalesViewHolder(binding)
    }

    override fun onBindViewHolder(holder: SalesViewHolder, position: Int) {
        val order = orders[position]
        holder.binding.apply {
            tvTableNumber.text = "Mesa #${order.table_number}"
            tvTotal.text = String.format("$%.2f", order.total)
            
            // Show date instead of just items maybe? Or both.
            // For now, items.
            val itemsText = order.items.joinToString("\n") { "${it.quantity}x ${it.productName}" }
            tvOrderItems.text = itemsText

            btnPay.visibility = android.view.View.GONE // Hide Pay button
        }
    }

    override fun getItemCount() = orders.size

    fun updateData(newOrders: List<Order>) {
        orders = newOrders
        notifyDataSetChanged()
    }
}
