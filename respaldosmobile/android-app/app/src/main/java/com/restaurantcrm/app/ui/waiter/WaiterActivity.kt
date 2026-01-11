package com.restaurantcrm.app.ui.waiter

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.databinding.ActivityWaiterBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class WaiterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityWaiterBinding
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWaiterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Aquí podrías recibir el nombre del mesero vía Intent como hicimos con el Admin
        val waiterName = intent.getStringExtra("USER_NAME") ?: "Mesero"
        binding.tvWaiterTitle.text = "¡Hola, $waiterName!"

        binding.btnLogoutWaiter.setOnClickListener {
            performLogout()
        }
    }

    private fun performLogout() {
        lifecycleScope.launch {
            authRepository.signOut()
            val intent = Intent(this@WaiterActivity, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}