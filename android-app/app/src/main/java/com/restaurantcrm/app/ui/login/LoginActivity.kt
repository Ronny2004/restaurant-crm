package com.restaurantcrm.app.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.databinding.ActivityLoginBinding
import com.restaurantcrm.app.ui.admin.AdminActivity
import com.restaurantcrm.app.ui.cashier.CashierActivity
import com.restaurantcrm.app.ui.chef.ChefActivity
import com.restaurantcrm.app.ui.waiter.WaiterActivity

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var viewModel: LoginViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Manual Dependency Injection for simplicity
        val repository = AuthRepository()
        val factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return LoginViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory)[LoginViewModel::class.java]

        setupObservers()
        setupListeners()
    }
    private fun setupObservers() {
        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnLogin.text = if (isLoading) "" else "Iniciar Sesión"
            binding.btnLogin.isEnabled = !isLoading
            binding.etEmail.isEnabled = !isLoading
            binding.etPassword.isEnabled = !isLoading
        }

        viewModel.loginResult.observe(this) { result ->
            if (result.isSuccess) {
                val profile = result.getOrNull()
                binding.tvError.visibility = View.GONE

                // Navegación basada en roles (Router)
                val intent = when (profile?.role) {
                    "admin" -> Intent(this, AdminActivity::class.java)
                    "waiter" -> Intent(this, WaiterActivity::class.java)
                    "chef" -> Intent(this, ChefActivity::class.java)
                    "cashier" -> Intent(this, CashierActivity::class.java)
                    else -> null
                }

                if (intent != null) {
                    startActivity(intent)
                    finish() // Evita regresar al Login con el botón "atrás"
                } else {
                    Toast.makeText(this, "Rol no reconocido: ${profile?.role}", Toast.LENGTH_LONG).show()
                }
            } else {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = result.exceptionOrNull()?.message ?: "Error desconocido"
            }
        }
    } // <-- Aquí faltaba cerrar setupObservers

    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()

            if (email.isNotEmpty() && password.isNotEmpty()) {
                viewModel.login(email, password)
            } else {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = "Completa todos los campos"
            }
        }
    }
}