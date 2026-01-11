package com.restaurantcrm.app.ui.admin.products

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.restaurantcrm.app.data.ProductRepository
import com.restaurantcrm.app.data.model.Product
import com.restaurantcrm.app.databinding.ActivityProductListBinding
import kotlinx.coroutines.launch

class ProductListActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProductListBinding
    private val repository = ProductRepository()
    private val adapter = ProductAdapter(emptyList(), ::onProductClick, ::onDeleteClick)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProductListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        setupRecyclerView()
        setupListeners()
        loadProducts()
        
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Inventario"
    }
    
    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    override fun onResume() {
        super.onResume()
        loadProducts()
    }

    private fun setupRecyclerView() {
        binding.rvProducts.layoutManager = LinearLayoutManager(this)
        binding.rvProducts.adapter = adapter
    }

    private fun setupListeners() {
        binding.fabAddProduct.setOnClickListener {
            startActivity(Intent(this, AddEditProductActivity::class.java))
        }
    }

    private fun loadProducts() {
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val products = repository.getProducts()
                adapter.updateData(products)
            } catch (e: Exception) {
                Toast.makeText(this@ProductListActivity, "Error cargando productos", Toast.LENGTH_SHORT).show()
                e.printStackTrace()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun onProductClick(product: Product) {
        val intent = Intent(this, AddEditProductActivity::class.java)
        intent.putExtra("PRODUCT_ID", product.id)
        intent.putExtra("PRODUCT_NAME", product.name)
        intent.putExtra("PRODUCT_CATEGORY", product.category)
        intent.putExtra("PRODUCT_PRICE", product.price)
        intent.putExtra("PRODUCT_STOCK", product.stock)
        startActivity(intent)
    }

    private fun onDeleteClick(product: Product) {
        AlertDialog.Builder(this)
            .setTitle("Confirmar Eliminación")
            .setMessage("¿Estás seguro de eliminar ${product.name}?")
            .setPositiveButton("Eliminar") { _, _ ->
                deleteProduct(product.id)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun deleteProduct(id: String) {
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                repository.deleteProduct(id)
                Toast.makeText(this@ProductListActivity, "Producto eliminado", Toast.LENGTH_SHORT).show()
                loadProducts()
            } catch (e: Exception) {
                val errorMessage = e.message ?: "Error desconocido"
                if (errorMessage.contains("HISTORICO")) {
                    AlertDialog.Builder(this@ProductListActivity)
                        .setTitle("No se puede eliminar")
                        .setMessage(errorMessage)
                        .setPositiveButton("Entendido", null)
                        .show()
                } else {
                    Toast.makeText(this@ProductListActivity, "Error: $errorMessage", Toast.LENGTH_LONG).show()
                }
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
}
