// ============================================
// SPACE FILE TRANSFER - FRONTEND
// Kết nối với Backend API
// ============================================

// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api'; // Production sẽ dùng relative path

// Global variables
let selectedFiles = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeDownload();
    loadStoredFiles();
});

// Section Navigation
function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Upload Functionality
function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = uploadArea.querySelector('.upload-btn');

    // Click to select files
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    displayFileList();
    
    if (selectedFiles.length > 0) {
        // Auto upload after selection
        setTimeout(() => {
            uploadFiles();
        }, 500);
    }
}

function displayFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
        return;
    }

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-icon">${getFileIcon(file.name)}</div>
                <div class="file-item-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="remove-file-btn" onclick="removeFile(${index})">Xóa</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFileList();
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'xls': '📊',
        'xlsx': '📊',
        'ppt': '📽️',
        'pptx': '📽️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'mp4': '🎬',
        'mp3': '🎵',
        'zip': '📦',
        'rar': '📦',
        'txt': '📃'
    };
    return icons[ext] || '📄';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function uploadFiles() {
    if (selectedFiles.length === 0) {
        alert('Vui lòng chọn file để upload!');
        return;
    }

    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadResult = document.getElementById('uploadResult');
    const fileList = document.getElementById('fileList');

    // Show progress
    uploadProgress.classList.remove('hidden');
    fileList.classList.add('hidden');

    try {
        // Upload từng file (có thể cải thiện bằng cách upload nhiều file cùng lúc)
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            // Update progress text
            progressText.textContent = `Đang upload: ${file.name}...`;
            
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            // Upload to server với progress tracking
            const xhr = new XMLHttpRequest();
            
            // Progress event
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = ((i + (e.loaded / e.total)) / selectedFiles.length) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = `Đang upload: ${Math.round(percentComplete)}%`;
                }
            });

            // Complete event
            await new Promise((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            // Lưu file code để hiển thị sau
                            if (i === selectedFiles.length - 1) {
                                completeUpload(response.data);
                            }
                            resolve();
                        } else {
                            reject(new Error(response.message));
                        }
                    } else {
                        reject(new Error('Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error'));
                });

                xhr.open('POST', `${API_URL}/upload`);
                xhr.send(formData);
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload thất bại: ' + error.message);
        resetUpload();
    }
}

function completeUpload(fileData) {
    // Show result
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadResult = document.getElementById('uploadResult');
    const shareLink = document.getElementById('shareLink');

    uploadProgress.classList.add('hidden');
    uploadResult.classList.remove('hidden');

    // Tạo share URL với file code
    const shareUrl = `${window.location.origin}${window.location.pathname}?file=${fileData.code}`;
    shareLink.value = shareUrl;

    // Add copy animation
    setTimeout(() => {
        shareLink.select();
    }, 300);
}

// Không cần generateFileId nữa vì server sẽ tạo

function copyLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');

    // Show feedback
    const copyBtn = document.querySelector('.copy-btn span');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Đã copy!';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
}

function resetUpload() {
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('fileList').classList.remove('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('uploadResult').classList.add('hidden');
    document.getElementById('progressFill').style.width = '0%';
}

// Download Functionality
function initializeDownload() {
    const downloadCode = document.getElementById('downloadCode');
    
    // Check URL for file parameter
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('file');
    
    if (fileId) {
        downloadCode.value = fileId;
        showSection('download');
        setTimeout(() => {
            downloadFile();
        }, 500);
    }

    // Enter key to download
    downloadCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadFile();
        }
    });
}

async function downloadFile() {
    const downloadCode = document.getElementById('downloadCode');
    const fileCode = extractFileId(downloadCode.value);
    
    if (!fileCode) {
        alert('Vui lòng nhập mã file hoặc link hợp lệ!');
        return;
    }

    try {
        // Gọi API để lấy thông tin file
        const response = await fetch(`${API_URL}/file/${fileCode}`);
        const result = await response.json();

        if (!result.success) {
            alert('Không tìm thấy file! Link có thể đã hết hạn hoặc không tồn tại.');
            return;
        }

        displayDownloadInfo(result.data);
    } catch (error) {
        console.error('Download error:', error);
        alert('Lỗi khi tải file: ' + error.message);
    }
}

function extractFileId(input) {
    // If it's a URL, extract the file parameter
    if (input.includes('?file=')) {
        const match = input.match(/\?file=([^&]+)/);
        return match ? match[1] : null;
    }
    // Otherwise, treat it as a direct file ID
    return input.trim();
}

function displayDownloadInfo(fileData) {
    const downloadInfo = document.getElementById('downloadInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const downloadBtn = downloadInfo.querySelector('.download-action-btn');

    // Display file info từ server
    fileName.textContent = fileData.originalName;
    fileSize.textContent = formatFileSize(fileData.size);

    downloadInfo.classList.remove('hidden');

    // Set download action
    downloadBtn.onclick = () => {
        initiateDownload(fileData);
    };
}

function initiateDownload(fileData) {
    // Tạo link download từ server
    const downloadUrl = `${API_URL}/download/${fileData.code}`;
    
    // Tạo thẻ <a> để trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileData.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success message
    const downloadBtn = document.querySelector('.download-action-btn span');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = '✓ Đang tải xuống...';
    
    setTimeout(() => {
        downloadBtn.textContent = originalText;
    }, 3000);
}

// Không cần loadStoredFiles nữa vì dùng server
function loadStoredFiles() {
    // Server sẽ quản lý files
    console.log('Files are managed by server');
}

// Add some visual effects
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.glass-card');
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;
            
            card.style.transform = `perspective(1000px) rotateY(${deltaX * 5}deg) rotateX(${-deltaY * 5}deg)`;
        } else {
            card.style.transform = '';
        }
    });
});

// Add particle effect on button click
document.addEventListener('click', (e) => {
    if (e.target.closest('.liquid-glass-btn')) {
        createParticles(e.clientX, e.clientY);
    }
});

function createParticles(x, y) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899'];
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.borderRadius = '50%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;
        
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / 6;
        const velocity = 2 + Math.random() * 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let posX = x;
        let posY = y;
        let opacity = 1;
        
        const animate = () => {
            posX += vx;
            posY += vy;
            opacity -= 0.02;
            
            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        animate();
    }
}
