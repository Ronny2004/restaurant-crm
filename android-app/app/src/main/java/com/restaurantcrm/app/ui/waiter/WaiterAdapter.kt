package com.restaurantcrm.app.ui.waiter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.restaurantcrm.app.data.model.Product
import com.restaurantcrm.app.databinding.ItemWaiterProductBinding

class WaiterAdapter(
    private var products: List<Product>,
    private val onIncrease: (Product) -> Unit,
    private val onDecrease: (Product) -> Unit
) : RecyclerView.Adapter<WaiterAdapter.WaiterViewHolder>() {

    private val cartState = mutableMapOf<String, Int>()

    inner class WaiterViewHolder(val binding: ItemWaiterProductBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WaiterViewHolder {
        val binding = ItemWaiterProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return WaiterViewHolder(binding)
    }

    override fun onBindViewHolder(holder: WaiterViewHolder, position: Int) {
        val product = products[position]
        holder.binding.apply {
            tvName.text = product.name
            tvCategory.text = product.category
            tvPrice.text = String.format("$%.2f", product.price)

            val qty = cartState[product.id] ?: 0
            tvQuantity.text = qty.toString()
            
            // Visual feedback handled by text, no need to hide
            
            btnPlus.setOnClickListener { onIncrease(product) }
            btnMinus.setOnClickListener { onDecrease(product) }
            
            // Disable root click
            root.isClickable = false
        }
    }

    override fun getItemCount() = products.size

    fun updateData(newProducts: List<Product>) {
        products = newProducts
        notifyDataSetChanged()
    }

    fun updateCart(cart: Map<String, Int>) {
        cartState.clear()
        cartState.putAll(cart)
        notifyDataSetChanged() // Inefficient but safe for now. optimizing later
    }
}
