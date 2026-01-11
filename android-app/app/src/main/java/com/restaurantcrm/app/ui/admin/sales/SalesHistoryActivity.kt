package com.restaurantcrm.app.ui.admin.sales

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.restaurantcrm.app.data.OrderRepository
import com.restaurantcrm.app.databinding.ActivitySalesHistoryBinding
import kotlinx.coroutines.launch
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.text.SimpleDateFormat
import java.util.*
import androidx.core.util.Pair

class SalesHistoryActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySalesHistoryBinding
    private val orderRepository = OrderRepository()
    private val adapter = SalesAdapter(emptyList())
    
    private var currentFilterType = "all"
    private var selectedDate: Long? = null
    private var selectedDateRange: Pair<Long, Long>? = null
    private var selectedMonth: Int? = null
    private var selectedYear: Int? = null

    private val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
    private val displayDateSdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySalesHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { finish() }

        setupRecyclerView()
        setupListeners()
        loadSales()
    }

    private fun setupRecyclerView() {
        binding.rvSales.layoutManager = LinearLayoutManager(this)
        binding.rvSales.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnSelectFilter.setOnClickListener {
            showFilterDialog()
        }
    }

    private fun showFilterDialog() {
        val options = arrayOf("Ver Todo", "Día Específico", "Mes", "Año", "Rango de Fechas")
        MaterialAlertDialogBuilder(this)
            .setTitle("Filtrar por")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> setFilter("all")
                    1 -> showDatePicker()
                    2 -> showMonthPicker()
                    3 -> showYearPicker()
                    4 -> showRangePicker()
                }
            }
            .show()
    }

    private fun setFilter(type: String, date: Long? = null, range: Pair<Long, Long>? = null, month: Int? = null, year: Int? = null) {
        currentFilterType = type
        selectedDate = date
        selectedDateRange = range
        selectedMonth = month
        selectedYear = year
        
        binding.btnSelectFilter.text = when(type) {
            "day" -> "Día: ${displayDateSdf.format(Date(date!!))}"
            "month" -> "Mes: ${month!! + 1}/$year"
            "year" -> "Año: $year"
            "range" -> "Rango..."
            else -> "Todo"
        }
        
        loadSales()
    }

    private fun showDatePicker() {
        val picker = MaterialDatePicker.Builder.datePicker().build()
        picker.addOnPositiveButtonClickListener { setFilter("day", date = it) }
        picker.show(supportFragmentManager, "date_picker")
    }

    private fun showMonthPicker() {
        // Simple year/month selection would ideally be a custom dialog, 
        // using year for now as placeholder for simplicity in this turn
        setFilter("month", month = Calendar.getInstance().get(Calendar.MONTH), year = Calendar.getInstance().get(Calendar.YEAR))
    }

    private fun showYearPicker() {
        setFilter("year", year = Calendar.getInstance().get(Calendar.YEAR))
    }

    private fun showRangePicker() {
        val picker = MaterialDatePicker.Builder.dateRangePicker().build()
        picker.addOnPositiveButtonClickListener { setFilter("range", range = it) }
        picker.show(supportFragmentManager, "range_picker")
    }

    private fun loadSales() {
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val allOrders = orderRepository.getOrders()
                val paidOrders = allOrders.filter { it.status == "paid" }
                
                val filtered = paidOrders.filter { order ->
                    val orderDate = sdf.parse(order.created_at) ?: return@filter false
                    val cal = Calendar.getInstance().apply { time = orderDate }
                    
                    when (currentFilterType) {
                        "day" -> {
                            val target = Calendar.getInstance().apply { timeInMillis = selectedDate!! }
                            cal.get(Calendar.YEAR) == target.get(Calendar.YEAR) &&
                                    cal.get(Calendar.DAY_OF_YEAR) == target.get(Calendar.DAY_OF_YEAR)
                        }
                        "month" -> {
                            cal.get(Calendar.YEAR) == selectedYear && cal.get(Calendar.MONTH) == selectedMonth
                        }
                        "year" -> {
                            cal.get(Calendar.YEAR) == selectedYear
                        }
                        "range" -> {
                            val start = selectedDateRange!!.first
                            val end = selectedDateRange!!.second
                            orderDate.time in start..end
                        }
                        else -> true
                    }
                }

                val total = filtered.sumOf { it.total }
                binding.tvSaleCount.text = "${filtered.size} transacciones"
                binding.tvPeriodTotal.text = String.format("Total: $%.2f", total)
                
                adapter.updateData(filtered.reversed())
            } catch (e: Exception) {
                Toast.makeText(this@SalesHistoryActivity, "Error cargando historial", Toast.LENGTH_SHORT).show()
                e.printStackTrace()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
}
