package com.restaurantcrm.app.ui.cashier

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.restaurantcrm.app.R
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.data.OrderRepository
import com.restaurantcrm.app.data.model.Order
import com.restaurantcrm.app.databinding.ActivityCashierBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class CashierActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCashierBinding
    private val orderRepository = OrderRepository()
    private val authRepository = AuthRepository()
    private val adapter = CashierAdapter(emptyList(), ::onPayClick)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCashierBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        setupRecyclerView()
        setupListeners()
        loadOrders()

        val isAdmin = intent.getBooleanExtra("IS_ADMIN_MODE", false)
        if (isAdmin) {
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
            supportActionBar?.title = "Caja (Admin View)"
        }
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_waiter, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish()
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
        binding.rvOrders.layoutManager = LinearLayoutManager(this)
        binding.rvOrders.adapter = adapter
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            loadOrders()
        }
    }

    private fun loadOrders() {
        binding.swipeRefresh.isRefreshing = true
        lifecycleScope.launch {
            try {
                val allOrders = orderRepository.getOrders()
                // Filter ready or served orders
                val readyOrders = allOrders.filter { it.status == "ready" || it.status == "served" }
                
                adapter.updateData(readyOrders)
                
                binding.tvEmpty.visibility = if (readyOrders.isEmpty()) View.VISIBLE else View.GONE
                
            } catch (e: Exception) {
                Toast.makeText(this@CashierActivity, "Error cargando pedidos", Toast.LENGTH_SHORT).show()
            } finally {
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun onPayClick(order: Order) {
        AlertDialog.Builder(this)
            .setTitle("Confirmar Pago")
            .setMessage("¿Confirmar pago de $${order.total} para la Mesa ${order.table_number}?")
            .setPositiveButton("Cobrar") { _, _ ->
                processPayment(order)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun processPayment(order: Order) {
        lifecycleScope.launch {
            try {
                orderRepository.updateOrderStatus(order.id, "paid")
                Toast.makeText(this@CashierActivity, "Pago registrado", Toast.LENGTH_SHORT).show()
                loadOrders()
            } catch (e: Exception) {
                Toast.makeText(this@CashierActivity, "Error procesando pago", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun logout() {
        lifecycleScope.launch {
            authRepository.signOut()
            startActivity(Intent(this@CashierActivity, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
        }
    }
}