package com.restaurantcrm.app.ui.admin

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.data.OrderRepository
import com.restaurantcrm.app.databinding.ActivityAdminBinding
import com.restaurantcrm.app.ui.admin.products.ProductListActivity
import com.restaurantcrm.app.ui.admin.sales.SalesHistoryActivity
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class AdminActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdminBinding
    private val authRepository = AuthRepository()
    private val orderRepository = OrderRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        binding.chipAll.isChecked = true
        loadStats()
    }

    override fun onResume() {
        super.onResume()
        loadStats() // Reload stats when coming back
    }

    private fun setupListeners() {
        binding.btnLogout.setOnClickListener {
            com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                .setTitle("¿Cerrar Sesión?")
                .setMessage("¿Estás seguro de que deseas salir del sistema?")
                .setPositiveButton("Salir") { _, _ -> logout() }
                .setNegativeButton("Cancelar", null)
                .show()
        }

        binding.btnInventory.setOnClickListener {
            startActivity(Intent(this, ProductListActivity::class.java))
        }

        // REDIRECCIÓN PARA VENTAS
        binding.cardSales.setOnClickListener {
            startActivity(Intent(this, SalesHistoryActivity::class.java))
        }

        binding.cardTotalOrders.setOnClickListener {
            startActivity(Intent(this, SalesHistoryActivity::class.java))
        }

        // ACCESOS RÁPIDOS A ROLES
        binding.btnGoToWaiter.setOnClickListener {
            val intent = Intent(this, com.restaurantcrm.app.ui.waiter.WaiterActivity::class.java)
            intent.putExtra("IS_ADMIN_MODE", true)
            startActivity(intent)
        }

        binding.btnGoToChef.setOnClickListener {
            val intent = Intent(this, com.restaurantcrm.app.ui.chef.ChefActivity::class.java)
            intent.putExtra("IS_ADMIN_MODE", true)
            startActivity(intent)
        }

        binding.btnGoToCashier.setOnClickListener {
            val intent = Intent(this, com.restaurantcrm.app.ui.cashier.CashierActivity::class.java)
            intent.putExtra("IS_ADMIN_MODE", true)
            startActivity(intent)
        }

        binding.chipGroupFilters.setOnCheckedChangeListener { _, checkedId ->
            loadStats()
        }
    }

    private fun loadStats() {
        lifecycleScope.launch {
            try {
                val allOrders = orderRepository.getOrders()
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val now = Calendar.getInstance()

                val filteredOrders = when (binding.chipGroupFilters.checkedChipId) {
                    binding.chipToday.id -> {
                        allOrders.filter {
                            val date = sdf.parse(it.created_at) ?: return@filter false
                            val cal = Calendar.getInstance().apply { time = date }
                            cal.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
                                    cal.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR)
                        }
                    }
                    binding.chipWeek.id -> {
                        allOrders.filter {
                            val date = sdf.parse(it.created_at) ?: return@filter false
                            val cal = Calendar.getInstance().apply { time = date }
                            val startOfWeek = Calendar.getInstance().apply {
                                set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
                                set(Calendar.HOUR_OF_DAY, 0)
                                set(Calendar.MINUTE, 0)
                                set(Calendar.SECOND, 0)
                            }
                            cal.after(startOfWeek)
                        }
                    }
                    binding.chipMonth.id -> {
                        allOrders.filter {
                            val date = sdf.parse(it.created_at) ?: return@filter false
                            val cal = Calendar.getInstance().apply { time = date }
                            cal.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
                                    cal.get(Calendar.MONTH) == now.get(Calendar.MONTH)
                        }
                    }
                    else -> allOrders
                }

                val totalSales = filteredOrders
                    .filter { it.status == "paid" }
                    .sumOf { it.total }

                val totalOrdersCount = filteredOrders.size

                binding.tvTotalSales.text = String.format("$%.2f", totalSales)
                binding.tvTotalOrders.text = totalOrdersCount.toString()

            } catch (e: Exception) {
                Log.e("AdminActivity", "Error loading stats", e)
                Toast.makeText(this@AdminActivity, "Error actualizando estadísticas", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun logout() {
        lifecycleScope.launch {
            authRepository.signOut()
            val intent = Intent(this@AdminActivity, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}