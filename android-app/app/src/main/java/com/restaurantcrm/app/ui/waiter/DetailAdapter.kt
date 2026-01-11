package com.restaurantcrm.app.ui.waiter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.restaurantcrm.app.data.model.Product
import com.restaurantcrm.app.databinding.ItemCashierOrderBinding // Reuse layout or create simple one?
// Let's create a simple item layout for details to avoid complex reusing

class DetailAdapter(
    private val items: Map<Product, Int>
) : RecyclerView.Adapter<DetailAdapter.DetailViewHolder>() {

    inner class DetailViewHolder(itemView: android.view.View) : RecyclerView.ViewHolder(itemView)
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DetailViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(com.restaurantcrm.app.R.layout.item_detail_row, parent, false)
        return DetailViewHolder(view)
    }

    override fun onBindViewHolder(holder: DetailViewHolder, position: Int) {
        val product = items.keys.elementAt(position)
        val qty = items[product] ?: 0

        // Use findViewById since we didn't use Binding for this simple adapter yet, or switch to Binding.
        // For speed, findViewById is fine here.
        val tvName = holder.itemView.findViewById<android.widget.TextView>(com.restaurantcrm.app.R.id.tvDetailName)
        val tvQty = holder.itemView.findViewById<android.widget.TextView>(com.restaurantcrm.app.R.id.tvDetailQty)
        val tvPrice = holder.itemView.findViewById<android.widget.TextView>(com.restaurantcrm.app.R.id.tvDetailPrice)

        tvName.text = product.name
        tvQty.text = "x$qty"
        tvPrice.text = String.format("$%.2f", product.price * qty)
    }

    override fun getItemCount() = items.size
}
