package com.restaurantcrm.app.ui.admin

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.databinding.ActivityAdminBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class AdminActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdminBinding
    private val repository = AuthRepository() // Instancia básica para el logout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnLogout.setOnClickListener {
            logout()
        }
    }

    private fun logout() {
        lifecycleScope.launch {
            repository.signOut()
            val intent = Intent(this@AdminActivity, LoginActivity::class.java)
            // Limpiamos el stack de navegación para que no pueda volver atrás al Admin
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}