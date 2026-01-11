package com.restaurantcrm.app.ui.cashier

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.restaurantcrm.app.data.model.Order
import com.restaurantcrm.app.databinding.ItemCashierOrderBinding

class CashierAdapter(
    private var orders: List<Order>,
    private val onPayClick: (Order) -> Unit
) : RecyclerView.Adapter<CashierAdapter.CashierViewHolder>() {

    inner class CashierViewHolder(val binding: ItemCashierOrderBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CashierViewHolder {
        val binding = ItemCashierOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CashierViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CashierViewHolder, position: Int) {
        val order = orders[position]
        holder.binding.apply {
            tvTableNumber.text = "Mesa #${order.table_number}"
            tvTotal.text = String.format("$%.2f", order.total)

            val itemsText = order.items.joinToString("\n") { "${it.quantity}x ${it.productName}" }
            tvOrderItems.text = itemsText

            btnPay.setOnClickListener { onPayClick(order) }
        }
    }

    override fun getItemCount() = orders.size

    fun updateData(newOrders: List<Order>) {
        orders = newOrders
        notifyDataSetChanged()
    }
}
