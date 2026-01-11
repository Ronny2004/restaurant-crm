package com.restaurantcrm.app.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.restaurantcrm.app.data.model.UserProfile
import com.restaurantcrm.app.data.AuthRepository
import kotlinx.coroutines.launch

class LoginViewModel(private val repository: AuthRepository) : ViewModel() {

    private val _loginResult = MutableLiveData<Result<UserProfile>>()
    val loginResult: LiveData<Result<UserProfile>> = _loginResult

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    // Dentro de LoginViewModel.kt
    fun login(email: String, password: String) {
        _isLoading.value = true
        viewModelScope.launch {
            val authResult = repository.signIn(email, password)

            if (authResult.isSuccess) {
                // AQUÍ SOLUCIONAMOS TU ERROR: Definimos 'user' antes de usarlo
                val user = repository.getCurrentUser()

                if (user != null) {
                    val profileResult = repository.fetchProfile(user.id)

                    if (profileResult.isSuccess) {
                        _loginResult.value = Result.success(profileResult.getOrThrow())
                    } else {
                        _loginResult.value = Result.failure(Exception("Perfil no encontrado"))
                    }
                } else {
                    _loginResult.value = Result.failure(Exception("Sesión inválida"))
                }
            } else {
                _loginResult.value = Result.failure(authResult.exceptionOrNull() ?: Exception("Error de red"))
            }
            _isLoading.value = false
        }
    }
}
