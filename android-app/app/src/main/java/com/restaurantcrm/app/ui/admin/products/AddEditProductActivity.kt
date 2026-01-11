package com.restaurantcrm.app.ui.admin.products

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.ProductRepository
import com.restaurantcrm.app.data.model.Product
import com.restaurantcrm.app.databinding.ActivityAddEditProductBinding
import kotlinx.coroutines.launch

class AddEditProductActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddEditProductBinding
    private val repository = ProductRepository()
    private var productId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddEditProductBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Agregar Producto" // Default

        checkIntent()
        setupListeners()
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    private fun checkIntent() {
        if (intent.hasExtra("PRODUCT_ID")) {
            productId = intent.getStringExtra("PRODUCT_ID")
            supportActionBar?.title = "Editar Producto"
            
            // Pre-fill data
            binding.etName.setText(intent.getStringExtra("PRODUCT_NAME"))
            binding.etCategory.setText(intent.getStringExtra("PRODUCT_CATEGORY"))
            binding.etPrice.setText(intent.getDoubleExtra("PRODUCT_PRICE", 0.0).toString())
            binding.etStock.setText(intent.getIntExtra("PRODUCT_STOCK", 0).toString())
        }
    }

    private fun setupListeners() {
        binding.btnSave.setOnClickListener {
            saveProduct()
        }
    }

    private fun saveProduct() {
        val name = binding.etName.text.toString().trim()
        val category = binding.etCategory.text.toString().trim()
        val priceStr = binding.etPrice.text.toString().trim()
        val stockStr = binding.etStock.text.toString().trim()

        if (name.isEmpty() || category.isEmpty() || priceStr.isEmpty() || stockStr.isEmpty()) {
            Toast.makeText(this, "Completa todos los campos", Toast.LENGTH_SHORT).show()
            return
        }

        val price = priceStr.toDoubleOrNull()
        val stock = stockStr.toIntOrNull()

        if (price == null || price <= 0) {
            binding.tilPrice.error = "Precio inválido"
            return
        } else {
            binding.tilPrice.error = null
        }

        if (stock == null || stock < 0) {
            binding.tilStock.error = "Stock inválido"
            return
        } else {
            binding.tilStock.error = null
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnSave.isEnabled = false

        lifecycleScope.launch {
            try {
                if (productId != null) {
                    // Update
                    val product = Product(
                        id = productId!!,
                        name = name,
                        category = category,
                        price = price,
                        stock = stock
                    )
                    repository.updateProduct(productId!!, product)
                    Toast.makeText(this@AddEditProductActivity, "Producto actualizado", Toast.LENGTH_SHORT).show()
                } else {
                    // Create (Supabase generates ID mostly, but let's check model)
                    // Product model has ID, but Supabase ignores it on insert if not provided or configured to generate.
                    // We'll send empty ID as it's likely serial/uuid on DB side.
                    val product = Product(
                        name = name,
                        category = category,
                        price = price,
                        stock = stock
                    )
                    repository.createProduct(product)
                    Toast.makeText(this@AddEditProductActivity, "Producto creado", Toast.LENGTH_SHORT).show()
                }
                finish()
            } catch (e: Exception) {
                Toast.makeText(this@AddEditProductActivity, "Error al guardar: ${e.message}", Toast.LENGTH_LONG).show()
                e.printStackTrace()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnSave.isEnabled = true
            }
        }
    }
}
