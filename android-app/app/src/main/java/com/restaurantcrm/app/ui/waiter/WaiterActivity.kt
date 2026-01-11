package com.restaurantcrm.app.ui.waiter

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.restaurantcrm.app.R
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.data.OrderRepository
import com.restaurantcrm.app.data.ProductRepository
import com.restaurantcrm.app.data.model.Order
import com.restaurantcrm.app.data.model.OrderItem
import com.restaurantcrm.app.data.model.Product
import com.restaurantcrm.app.databinding.ActivityWaiterBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class WaiterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityWaiterBinding
    private val productRepository = ProductRepository()
    private val orderRepository = OrderRepository()
    private val authRepository = AuthRepository()
    
    private val adapter = WaiterAdapter(emptyList(), ::onIncrease, ::onDecrease)
    private val cart = mutableMapOf<Product, Int>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWaiterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)

        setupRecyclerView()
        setupListeners()
        loadProducts()
        val isAdmin = intent.getBooleanExtra("IS_ADMIN_MODE", false)
        if (isAdmin) {
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
            supportActionBar?.title = "Mesero (Admin View)"
        }
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_waiter, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish() // Go back to Admin Dashboard
                true
            }
            R.id.action_logout -> {
                com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                    .setTitle("¿Cerrar Sesión?")
                    .setMessage("¿Estás seguro de que deseas salir del sistema?")
                    .setPositiveButton("Salir") { _, _ -> logout() }
                    .setNegativeButton("Cancelar", null)
                    .show()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun setupRecyclerView() {
        binding.rvProducts.layoutManager = GridLayoutManager(this, 2)
        binding.rvProducts.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnPlaceOrder.setOnClickListener {
            showTableDialog()
        }
        binding.btnViewDetail.setOnClickListener {
            showOrderDetails()
        }
    }

    private fun loadProducts() {
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val products = productRepository.getProducts()
                adapter.updateData(products)
            } catch (e: Exception) {
                Toast.makeText(this@WaiterActivity, "Error cargando productos", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun onIncrease(product: Product) {
        val currentQty = cart[product] ?: 0
        if (product.stock > 0 && currentQty < product.stock) {
            cart[product] = currentQty + 1
            updateCartUI()
        } else {
            Toast.makeText(this, "Sin stock suficiente", Toast.LENGTH_SHORT).show()
        }
    }

    private fun onDecrease(product: Product) {
        val currentQty = cart[product] ?: 0
        if (currentQty > 0) {
            if (currentQty == 1) {
                cart.remove(product)
            } else {
                cart[product] = currentQty - 1
            }
            updateCartUI()
        }
    }

    private fun updateCartUI() {
        var total = 0.0
        var count = 0
        val cartMapForAdapter = mutableMapOf<String, Int>()

        cart.forEach { (product, qty) ->
            total += product.price * qty
            count += qty
            cartMapForAdapter[product.id] = qty
        }

        binding.tvTotal.text = String.format("$%.2f", total)
        binding.btnPlaceOrder.isEnabled = count > 0
        binding.btnViewDetail.isEnabled = count > 0
        binding.btnPlaceOrder.text = "Confirmar Pedido ($count items)"
        
        adapter.updateCart(cartMapForAdapter)
    }

    private fun showOrderDetails() {
        val dialog = com.google.android.material.bottomsheet.BottomSheetDialog(this)
        val view = layoutInflater.inflate(R.layout.dialog_order_detail, null)
        dialog.setContentView(view)

        val rvDetails = view.findViewById<androidx.recyclerview.widget.RecyclerView>(R.id.rvDetailItems)
        val tvTotal = view.findViewById<android.widget.TextView>(R.id.tvSheetTotal)
        val btnConfirm = view.findViewById<android.widget.Button>(R.id.btnConfirmSheet)

        rvDetails.layoutManager = androidx.recyclerview.widget.LinearLayoutManager(this)
        rvDetails.adapter = DetailAdapter(cart)
        
        val total = cart.entries.sumOf { it.key.price * it.value }
        tvTotal.text = String.format("$%.2f", total)
        
        btnConfirm.setOnClickListener {
            dialog.dismiss()
            showTableDialog()
        }
        
        dialog.show()
    }

    private fun showTableDialog() {
        val input = EditText(this)
        input.inputType = InputType.TYPE_CLASS_NUMBER
        input.hint = "Número de Mesa (ej: 5)"

        AlertDialog.Builder(this)
            .setTitle("Confirmar Pedido")
            .setMessage("Ingresa el número de mesa para este pedido:")
            .setView(input)
            .setPositiveButton("Enviar") { _, _ ->
                val tableNumber = input.text.toString()
                if (tableNumber.isNotEmpty()) {
                    placeOrder(tableNumber)
                } else {
                    Toast.makeText(this, "Mesa requerida", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun placeOrder(tableNumber: String) {
        binding.progressBar.visibility = View.VISIBLE
        binding.btnPlaceOrder.isEnabled = false

        lifecycleScope.launch {
            try {
                val orderItems = cart.map { (product, qty) ->
                    OrderItem(
                        product_id = product.id,
                        quantity = qty,
                        price = product.price
                    )
                }
                
                val total = cart.entries.sumOf { it.key.price * it.value }

                val order = Order(
                    table_number = tableNumber,
                    status = "pending",
                    total = total,
                    items = orderItems
                )

                orderRepository.createOrder(order)
                
                Toast.makeText(this@WaiterActivity, "Pedido enviado a Cocina!", Toast.LENGTH_LONG).show()
                cart.clear()
                updateCartUI()
                
            } catch (e: Exception) {
                Toast.makeText(this@WaiterActivity, "Error enviando pedido: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnPlaceOrder.isEnabled = cart.isNotEmpty()
            }
        }
    }

    private fun logout() {
        lifecycleScope.launch {
            authRepository.signOut()
            startActivity(Intent(this@WaiterActivity, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
        }
    }
}